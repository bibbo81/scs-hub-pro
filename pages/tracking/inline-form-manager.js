// /pages/tracking/inline-form-manager.js

class InlineFormManager {
    constructor() {
        this.elements = {
            trackingNumber: document.getElementById('inline-tracking-number'),
            carrier: document.getElementById('inline-carrier'),
            action: document.getElementById('inline-tracking-action'),
            origin: document.getElementById('inline-origin'),
            destination: document.getElementById('inline-destination'),
            reference: document.getElementById('inline-reference'),
            transportMode: document.getElementById('inline-transport-mode'),
            vehicleType: document.getElementById('inline-vehicle-type'),
            eta: document.getElementById('inline-eta'),
            trackingType: document.getElementById('inline-tracking-type'),
            totalWeight: document.getElementById('inline-total-weight'),
            totalVolume: document.getElementById('inline-total-volume'),
            blNumber: document.getElementById('inline-bl-number'),
            flightNumber: document.getElementById('inline-flight-number'),
            submitBtn: document.getElementById('inline-submit-btn'),
            preview: document.getElementById('inline-live-preview'),
            detailsSection: document.getElementById('inline-details-section'),
        };
        this.detectionTimeout = null;
        this.detectedType = null;
        this.detectedOceanShipment = null;
        this.vehicleTypesData = []; // Store vehicle types data
    }

    init() {
        if (!this.elements.trackingNumber) {
            console.warn('Inline form elements not found. Aborting init.');
            return;
        }
        console.log('🚀 Initializing Inline Form Manager (v2)...');
        this.attachEventListeners();
        this.resetForm();
        this.loadTransportModes(); // Load transport modes on init
    }

    attachEventListeners() {
        this.elements.trackingNumber.addEventListener('input', () => {
            clearTimeout(this.detectionTimeout);
            this.detectionTimeout = setTimeout(() => this.handleTrackingNumberInput(), 500);
        });

        this.elements.submitBtn.addEventListener('click', () => this.handleSubmit());
        this.elements.transportMode.addEventListener('change', () => this.handleTransportModeChange());
        this.elements.action.addEventListener('change', () => this.handleActionChange());
        this.elements.trackingType.addEventListener('change', () => this.handleTrackingTypeChange());
        this.elements.vehicleType.addEventListener('change', () => this.handleVehicleTypeChange()); // New event listener
    }

    handleActionChange() {
    const action = this.elements.action.value;
    const isManual = action === 'manual';

    // Expand details for manual entry
    const collapse = document.getElementById('collapseDetails');
    if (isManual && collapse && !collapse.classList.contains('show')) {
        $(collapse).collapse('show');
    }

    // The tracking number is optional only for manual action.
    if (isManual) {
        this.elements.trackingNumber.placeholder = 'Opzionale, generato se vuoto';
        // FIX: Rendi obbligatorio il tipo di tracking per le spedizioni manuali
        this.elements.trackingType.required = true;
    } else {
        this.elements.trackingNumber.placeholder = 'Inserisci numero...';
        this.elements.trackingType.required = false;
    }

    // Reset values when switching from manual to auto/get
    if (!isManual) {
        this.elements.eta.value = '';
        this.elements.trackingType.value = '';
        this.elements.totalWeight.value = '';
        this.elements.totalVolume.value = '';
        this.elements.blNumber.value = '';
        this.elements.flightNumber.value = '';
    }
}

    handleTrackingTypeChange() {
        const trackingType = this.elements.trackingType.value;
        const isManualAction = this.elements.action.value === 'manual';

        if (isManualAction) {
            if (trackingType === 'container') {
                this.elements.blNumber.required = false;
                this.elements.flightNumber.required = false;
                this.elements.flightNumber.value = ''; // Clear if not relevant
            } else if (trackingType === 'air_waybill') {
                this.elements.blNumber.required = false;
                this.elements.blNumber.value = ''; // Clear if not relevant
                this.elements.flightNumber.required = false;
            } else {
                this.elements.blNumber.required = false;
                this.elements.flightNumber.required = false;
            }
        }
    }

    async handleTrackingNumberInput() {
        const trackingNumber = this.elements.trackingNumber.value.trim().toUpperCase();
        
        // Reset state
        this.detectedType = null;
        this.detectedOceanShipment = null;
        this.updatePreview('reset');

        if (!trackingNumber) {
            this.populateCarriers(null);
            return;
        }

        this.updatePreview('detecting');

        try {
            this.detectedType = await window.detectTrackingType(trackingNumber);
            this.populateCarriers(this.detectedType);

            if (this.detectedType === 'container') {
                this.detectedOceanShipment = await window.trackingService.findOceanShipmentByContainerNumber(trackingNumber);
            }
            
            this.updatePreview('success');

        } catch (error) {
            console.error('Detection error:', error);
            this.updatePreview('error');
            this.populateCarriers(null);
        }
    }

    async populateCarriers(trackingType) {
        const select = this.elements.carrier;
        if (!select) return;

        select.disabled = true;
        select.innerHTML = '<option value="">Caricamento...</option>';

        if (!trackingType || !window.trackingService) {
            select.innerHTML = '<option value="">Inserisci un numero...</option>';
            return;
        }

        try {
            let carriers = [];
            if (trackingType === 'container' || trackingType === 'bl') {
                carriers = await window.trackingService.getShippingLines();
            } else if (trackingType === 'awb') {
                carriers = await window.trackingService.getAirlines();
            }

            if (carriers.length > 0) {
                select.innerHTML = '<option value="">Seleziona carrier...</option>';
                carriers.forEach(carrier => {
                    const option = document.createElement('option');
                    option.value = carrier.code;
                    option.textContent = carrier.name;
                    select.appendChild(option);
                });
                select.disabled = false;
            } else {
                 select.innerHTML = '<option value="">Nessun carrier trovato</option>';
            }
        } catch (error) {
            console.error('Failed to load carriers:', error);
            select.innerHTML = '<option value="">Errore caricamento</option>';
        }
    }

    async loadTransportModes() {
        const select = this.elements.transportMode;
        if (!select) return;

        select.innerHTML = '<option value="">Caricamento...</option>';
        select.disabled = true;

        try {
            const { data, error } = await window.supabase
                .from('transport_modes')
                .select('id, name');

            if (error) throw error;

            select.innerHTML = '<option value="">Seleziona modalità...</option>';
            data.forEach(mode => {
                const option = document.createElement('option');
                option.value = mode.id;
                option.textContent = mode.name;
                select.appendChild(option);
            });
            select.disabled = false;
        } catch (error) {
            console.error('Failed to load transport modes:', error);
            select.innerHTML = '<option value="">Errore caricamento</option>';
        }
    }

    async handleTransportModeChange() {
        const transportModeId = this.elements.transportMode.value;
        const transportModeName = this.elements.transportMode.options[this.elements.transportMode.selectedIndex]?.text;

        // If mode is 'Road', hide the tracking type selector and default it to 'parcel'
        if (transportModeName === 'Road') {
            this.elements.trackingType.closest('.form-group').style.display = 'none';
            this.elements.trackingType.value = 'parcel';
        } else {
            this.elements.trackingType.closest('.form-group').style.display = 'block';
        }

        this.loadVehicleTypes(transportModeId);
    }

    async loadVehicleTypes(transportModeId) {
        const select = this.elements.vehicleType;
        if (!select) return;

        select.innerHTML = '<option value="">Caricamento...</option>';
        select.disabled = true;

        if (!transportModeId) {
            select.innerHTML = '<option value="">Seleziona tipo di mezzo...</option>';
            this.vehicleTypesData = []; // Clear stored data
            this.handleVehicleTypeChange(); // Reset weight/volume fields
            return;
        }

        try {
            console.log(`[Debug] Fetching vehicle types for transport_mode_id: ${transportModeId}`);
            const { data, error } = await window.supabase
                .from('vehicle_types')
                .select('id, name, default_cbm, default_kg'); // Fetch default_cbm and default_kg

            if (error) throw error;

            console.log('[Debug] Fetched vehicle types data:', data);
            this.vehicleTypesData = data; // Store fetched data

            select.innerHTML = '<option value="">Seleziona tipo di mezzo...</option>';
            data.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.name;
                select.appendChild(option);
            });
            select.disabled = false;
        } catch (error) {
            console.error('Failed to load vehicle types:', error);
            select.innerHTML = '<option value="">Errore caricamento</option>';
            this.vehicleTypesData = [];
        }
    }

    handleVehicleTypeChange() {
        const vehicleTypeId = this.elements.vehicleType.value;
        const selectedVehicleType = this.vehicleTypesData.find(type => type.id == vehicleTypeId); // Use == for type coercion

        if (selectedVehicleType) {
            this.elements.totalWeight.value = selectedVehicleType.default_kg || '';
            this.elements.totalVolume.value = selectedVehicleType.default_cbm || '';
            this.elements.totalWeight.readOnly = true;
            this.elements.totalVolume.readOnly = true;
        } else {
            // If no vehicle is selected, clear the fields and make them editable
            this.elements.totalWeight.value = '';
            this.elements.totalVolume.value = '';
            this.elements.totalWeight.readOnly = false;
            this.elements.totalVolume.readOnly = false;
        }
    }

    updatePreview(state) {
        const preview = this.elements.preview;
        if (!preview) return;

        switch(state) {
            case 'reset':
                preview.innerHTML = '<p class="text-muted">Inserisci un numero di tracking per vedere l\'anteprima.</p>';
                break;
            case 'detecting':
                preview.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Rilevamento in corso...</p>';
                break;
            case 'success':
                const typeLabel = this.detectedType === 'awb' ? 'Aereo (AWB)' : 'Marittimo (Container/BL)';
                let oceanIdInfo = '';
                if (this.detectedOceanShipment) {
                    oceanIdInfo = `<p class="text-info"><i class="fas fa-anchor"></i> Ocean ID trovato: <strong>${this.detectedOceanShipment.id}</strong></p>`;
                } else if (this.detectedType === 'container') {
                    oceanIdInfo = `<p class="text-secondary"><i class="fas fa-anchor"></i> Nessun Ocean ID esistente.</p>`;
                }

                preview.innerHTML = `
                    <p><strong>Numero:</strong> ${this.elements.trackingNumber.value.trim().toUpperCase()}</p>
                    <p><strong>Tipo Rilevato:</strong> ${typeLabel}</p>
                    ${oceanIdInfo}
                    <p class="text-success"><i class="fas fa-check-circle"></i> Pronto per l\'invio.</p>
                `;
                break;
            case 'error':
                preview.innerHTML = '<p class="text-danger"><i class="fas fa-exclamation-circle"></i> Errore nel rilevamento.</p>';
                break;
        }
    }
// Aggiungi questa funzione prima di handleSubmit per debug
debugTrackingData(data) {
    console.log('🔍 DEBUG TRACKING DATA:');
    console.log('======================');
    console.table({
        tracking_number: { value: data.tracking_number, type: typeof data.tracking_number },
        carrier_code: { value: data.carrier_code, type: typeof data.carrier_code },
        tracking_type: { value: data.tracking_type, type: typeof data.tracking_type },
        current_status: { value: data.current_status, type: typeof data.current_status },
        transport_mode_id: { value: data.transport_mode_id, type: typeof data.transport_mode_id },
        vehicle_type_id: { value: data.vehicle_type_id, type: typeof data.vehicle_type_id },
    });
    console.log('Full object:', data);
}
 async handleSubmit() {
    const action = this.elements.action.value;
    let trackingNumber = this.elements.trackingNumber.value.trim().toUpperCase();
    
    // Basic validation
    if (action !== 'manual' && !trackingNumber) {
        window.NotificationSystem?.error('Il numero di tracking è obbligatorio.');
        return;
    }

    const carrier = this.elements.carrier.value;
    if (!carrier) {
        window.NotificationSystem?.error('Il carrier è obbligatorio.');
        return;
    }

    // Get all other form data
    const origin = this.elements.origin.value.trim();
    const destination = this.elements.destination.value.trim();
    const reference = this.elements.reference.value.trim();
    const transportModeId = this.elements.transportMode.value;
    const vehicleTypeId = this.elements.vehicleType.value;
    const trackingType = this.elements.trackingType.value;
    const eta = this.elements.eta.value;
    const totalWeight = this.elements.totalWeight.value;
    const totalVolume = this.elements.totalVolume.value;
    const blNumber = this.elements.blNumber.value;
    const flightNumber = this.elements.flightNumber.value;

    this.elements.submitBtn.disabled = true;
    this.elements.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Elaborazione...';

    let dataToSave = {};

    try {
        if (action === 'manual') {
            // FIX COMPLETO: Validazione e mappatura corretta per il database
            const dbTrackingType = (trackingType === 'air_waybill') ? 'awb' : trackingType;
            
            // Validazione campi obbligatori
            if (!dbTrackingType || !['container', 'awb', 'bl', 'parcel'].includes(dbTrackingType)) {
                throw new Error('Seleziona un tipo di tracking valido (Container, AWB, B/L, Parcel).');
            }

            // Genera tracking number se vuoto
            if (!trackingNumber || trackingNumber.trim() === '') {
                trackingNumber = `MAN-${Date.now()}`;
            }

            // Get carrier name from select
            const carrierName = this.elements.carrier.options[this.elements.carrier.selectedIndex]?.text || null;

            // Costruisci l'oggetto con i campi corretti per il database
            dataToSave = {
                tracking_number: trackingNumber,
                carrier_code: carrier, // FIX: Usa carrier_code invece di carrier
                carrier_name: carrierName,
                tracking_type: dbTrackingType,
                reference_number: reference || null,
                origin_port: origin || null, // FIX: Usa origin_port invece di origin
                destination_port: destination || null, // FIX: Usa destination_port invece di destination
                current_status: 'pending', // FIX: Usa current_status invece di status
                eta: eta || null,
                // Validazione numerica rigorosa
                total_weight_kg: totalWeight && !isNaN(parseFloat(totalWeight)) ? parseFloat(totalWeight) : null,
                total_volume_cbm: totalVolume && !isNaN(parseFloat(totalVolume)) ? parseFloat(totalVolume) : null,
                transport_mode_id: transportModeId && transportModeId !== '' ? transportModeId : null, // Mantieni come UUID string
                vehicle_type_id: vehicleTypeId && vehicleTypeId !== '' ? vehicleTypeId : null, // Mantieni come UUID string
                bl_number: blNumber || null,
                flight_number: flightNumber || null,
            };

            // Validazione finale rigorosa
            if (!dataToSave.tracking_number || dataToSave.tracking_number.trim() === '') {
                throw new Error('Numero di tracking non può essere vuoto.');
            }
            if (!dataToSave.carrier_code || dataToSave.carrier_code.trim() === '') {
                throw new Error('Carrier non selezionato.');
            }
            if (!dataToSave.tracking_type) {
                throw new Error('Tipo di tracking non selezionato.');
            }

            console.log('Manual entry: Data ready for saving:', dataToSave);
            this.debugTrackingData(dataToSave); // AGGIUNGI QUESTA RIGA QUI
        } else {
            // Per azioni auto/get, usa il trackingService
            console.log('Step 1: Calling trackingService.track to get enriched data...');
            const result = await window.trackingService.track(
                trackingNumber,
                this.detectedType,
                {
                    operation: action,
                    carrier: carrier,
                    shipsgoId: this.detectedOceanShipment?.id,
                    carrier_name: this.elements.carrier.options[this.elements.carrier.selectedIndex]?.text,
                    origin: origin,
                    destination: destination,
                    reference: reference,
                    transport_mode_id: transportModeId,
                    vehicle_type_id: vehicleTypeId,
                }
            );

            if (!result || !result.success) {
                throw new Error(result?.apiError || 'Impossibile recuperare i dati dall\'API.');
            }
            
            dataToSave = { ...result };
            delete dataToSave.success;
            
            console.log('Service-based entry: Data ready for saving:', dataToSave);
        }

        if (!window.dataManager) {
            throw new Error("DataManager non è disponibile.");
        }
        
        console.log('Step 3: Saving data via DataManager...');
        const saveResult = await window.dataManager.addTracking(dataToSave, action === 'manual');

        if (saveResult && saveResult.tracking) {
            window.NotificationSystem?.success(`Tracking ${action === 'get' ? 'recuperato' : 'aggiunto'} con successo!`);
            this.resetForm();
            if (window.addTrackingToView) {
                window.addTrackingToView(saveResult.tracking);
            } else if (window.loadTrackings) {
                console.warn('addTrackingToView not found, falling back to full reload.');
                window.loadTrackings();
            }
        } else {
            throw new Error("Il salvataggio del tracking non ha restituito un risultato valido.");
        }

    } catch (error) {
        console.error('Submit Error:', error);
        
        // Debug dell'errore per capire il problema
        if (error.code) {
            console.error('Database error code:', error.code);
        }
        if (error.details) {
            console.error('Database error details:', error.details);
        }
        if (error.hint) {
            console.error('Database error hint:', error.hint);
        }
        
        // Mostra un messaggio di errore più dettagliato
        let errorMessage = 'Errore sconosciuto';
        if (error.message) {
            errorMessage = error.message;
        } else if (error.details) {
            errorMessage = `Errore database: ${error.details}`;
        } else if (error.hint) {
            errorMessage = `Suggerimento: ${error.hint}`;
        } else if (error.code) {
            errorMessage = `Errore ${error.code}`;
        }
        
        window.NotificationSystem?.error(`Errore: ${errorMessage}`);
    } finally {
        this.elements.submitBtn.disabled = false;
        this.elements.submitBtn.innerHTML = 'Aggiungi';
    }
}

    resetForm() {
        this.elements.trackingNumber.value = '';
        this.elements.origin.value = '';
        this.elements.destination.value = '';
        this.elements.reference.value = '';
        this.elements.action.value = 'manual';
        this.elements.preview.innerHTML = '<p class="text-muted">Inserisci un numero di tracking per vedere l\'anteprima.</p>';
        
        if (this.elements.carrier) {
            this.elements.carrier.innerHTML = '<option value="">Inserisci un numero...</option>';
            this.elements.carrier.disabled = true;
        }
        
        if (this.elements.transportMode) {
            this.elements.transportMode.value = '';
        }
        if (this.elements.vehicleType) {
            this.elements.vehicleType.innerHTML = '<option value="">Seleziona tipo di mezzo...</option>';
            this.elements.vehicleType.disabled = true;
        }

        // Clear new manual fields
        this.elements.eta.value = '';
        this.elements.trackingType.value = '';
        this.elements.totalWeight.value = '';
        this.elements.totalVolume.value = '';
        this.elements.blNumber.value = '';
        this.elements.flightNumber.value = '';
        this.elements.totalWeight.readOnly = false;
        this.elements.totalVolume.readOnly = false;

        const collapse = document.getElementById('collapseDetails');
        if (collapse && collapse.classList.contains('show')) {
            $(collapse).collapse('hide');
        }
        this.handleActionChange(); // Call to reset visibility based on default 'auto'
    }
}

// Inizializza il manager quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.inlineFormManager = new InlineFormManager();
    window.inlineFormManager.init();
});