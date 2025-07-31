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

        // Fields always visible
        this.elements.trackingNumber.required = !isManual;
        this.elements.carrier.required = true;

        // Fields for manual entry
        this.elements.eta.closest('.form-group').style.display = isManual ? 'block' : 'none';
        this.elements.trackingType.closest('.form-group').style.display = isManual ? 'block' : 'none';
        this.elements.totalWeight.closest('.form-group').style.display = isManual ? 'block' : 'none';
        this.elements.totalVolume.closest('.form-group').style.display = isManual ? 'block' : 'none';
        this.elements.blNumber.closest('.form-group').style.display = isManual ? 'block' : 'none';
        this.elements.flightNumber.closest('.form-group').style.display = isManual ? 'block' : 'none';

        // Set required attribute for manual fields
        this.elements.eta.required = isManual;
        this.elements.trackingType.required = isManual;
        this.elements.totalWeight.required = isManual;
        this.elements.totalVolume.required = isManual;
        // BL Number and Flight Number are conditionally required based on trackingType
        this.elements.blNumber.required = false;
        this.elements.flightNumber.required = false;

        // Reset values when switching from manual to auto/get
        if (!isManual) {
            this.elements.eta.value = '';
            this.elements.trackingType.value = '';
            this.elements.totalWeight.value = '';
            this.elements.totalVolume.value = '';
            this.elements.blNumber.value = '';
            this.elements.flightNumber.value = '';
        }

        // Update preview based on action
        if (isManual) {
            this.updatePreview('manual');
        } else {
            this.handleTrackingNumberInput(); // Re-evaluate for auto/get
        }
        this.handleTrackingTypeChange(); // Call this to set initial state for BL/Flight numbers
    }

    handleTrackingTypeChange() {
        const trackingType = this.elements.trackingType.value;
        const isManual = this.elements.action.value === 'manual';

        if (isManual) {
            if (trackingType === 'container') {
                this.elements.blNumber.required = true;
                this.elements.flightNumber.required = false;
                this.elements.flightNumber.value = ''; // Clear if not relevant
            } else if (trackingType === 'air_waybill') {
                this.elements.blNumber.required = false;
                this.elements.blNumber.value = ''; // Clear if not relevant
                this.elements.flightNumber.required = true;
            } else {
                this.elements.blNumber.required = false;
                this.elements.flightNumber.required = false;
                this.elements.blNumber.value = '';
                this.elements.flightNumber.value = '';
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
            const { data, error } = await window.supabase
                .from('vehicle_types')
                .select('id, name, default_cbm, default_kg') // Fetch default_cbm and default_kg
                .eq('transport_mode_id', transportModeId);

            if (error) throw error;

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
        const selectedVehicleType = this.vehicleTypesData.find(type => type.id === parseInt(vehicleTypeId, 10));
        const isManualAction = this.elements.action.value === 'manual';

        if (isManualAction && selectedVehicleType) {
            this.elements.totalWeight.value = selectedVehicleType.default_kg || '';
            this.elements.totalVolume.value = selectedVehicleType.default_cbm || '';
            this.elements.totalWeight.readOnly = true;
            this.elements.totalVolume.readOnly = true;
        } else {
            this.elements.totalWeight.readOnly = false;
            this.elements.totalVolume.readOnly = false;
            if (!isManualAction) { // Only clear if not manual and no vehicle type selected
                this.elements.totalWeight.value = '';
                this.elements.totalVolume.value = '';
            }
        }
    }

    updatePreview(state) {
        const preview = this.elements.preview;
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

    async handleSubmit() {
        const trackingNumber = this.elements.trackingNumber.value.trim().toUpperCase();
        const carrier = this.elements.carrier.value;
        const action = this.elements.action.value;
        const origin = this.elements.origin.value.trim();
        const destination = this.elements.destination.value.trim();
        const reference = this.elements.reference.value.trim();
        const transportModeId = this.elements.transportMode.value;
        const vehicleTypeId = this.elements.vehicleType.value;

        if (!trackingNumber && action !== 'manual') {
            window.NotificationSystem?.error('Il numero di tracking è obbligatorio per le azioni automatiche/recupero.');
            return;
        }
        if (!carrier) {
            window.NotificationSystem?.error('Il carrier è obbligatorio.');
            return;
        }

        this.elements.submitBtn.disabled = true;
        this.elements.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Elaborazione...';

        try {
            let dataToSave = {};

            if (action === 'manual') {
                // For manual entry, directly construct dataToSave
                dataToSave = {
                    tracking_number: trackingNumber,
                    carrier: carrier,
                    tracking_type: this.elements.trackingType.value || 'manual', // Use selected type or default to 'manual'
                    origin: origin,
                    destination: destination,
                    reference: reference,
                    transport_mode_id: transportModeId,
                    vehicle_type_id: vehicleTypeId,
                    current_status: 'pending', // Default status for manual entries
                    eta: this.elements.eta.value,
                    total_weight_kg: parseFloat(this.elements.totalWeight.value) || 0,
                    total_volume_cbm: parseFloat(this.elements.totalVolume.value) || 0,
                    bl_number: this.elements.blNumber.value,
                    flight_number: this.elements.flightNumber.value,
                };

                // Basic validation for manual fields
                if (!dataToSave.tracking_type) {
                    window.NotificationSystem?.error("Tipo di Tracking è obbligatorio per l'inserimento manuale.");
                    return;
                }
                if (dataToSave.tracking_type === 'container' && !dataToSave.bl_number) {
                    window.NotificationSystem?.error('B/L Number è obbligatorio per il tipo Marittimo.');
                    return;
                }
                if (dataToSave.tracking_type === 'air_waybill' && !dataToSave.flight_number) {
                    window.NotificationSystem?.error('Numero Volo è obbligatorio per il tipo Aereo.');
                    return;
                }
                console.log('Manual entry: Data ready for saving:', dataToSave);
            } else {
                // For 'auto' or 'get' actions, use trackingService.track
                console.log('Step 1: Calling trackingService.track to get enriched data...');
                const result = await window.trackingService.track(
                    trackingNumber,
                    this.detectedType,
                    {
                        operation: action, // 'auto', 'get', or 'post'
                        carrier: carrier,
                        shipsgoId: this.detectedOceanShipment?.id,
                        // Pass manual fields to the service for merging
                        origin: origin,
                        destination: destination,
                        reference: reference,
                        transport_mode_id: transportModeId,
                        vehicle_type_id: vehicleTypeId,
                    }
                );

                if (!result || !result.success) {
                    throw new Error(result.apiError || 'Impossibile recuperare i dati dall\'API.');
                }
                console.log('Service Result (fully mapped):', result);

                // The 'result' object is now the data to save. No more mapping needed here.
                dataToSave = { ...result };
                delete dataToSave.success; // Remove the success flag before saving
                console.log('Service-based entry: Data ready for saving:', dataToSave);
            }

            // Step 3: Save to database via DataManager
            if (!window.dataManager) {
                throw new Error("DataManager non è disponibile.");
            }
            console.log('Step 3: Saving data via DataManager...');
            const saveResult = await window.dataManager.addTracking(dataToSave, action === 'manual');

            if (saveResult.tracking) {
                window.NotificationSystem?.success(`Tracking ${action === 'get' ? 'recuperato' : 'aggiunto'} con successo!`);
                this.resetForm();
                
                // Step 4: Update UI instantly with the saved (and potentially updated by DB) tracking object
                if (window.addTrackingToView) {
                    console.log('Step 4: Updating view instantly.');
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
            window.NotificationSystem?.error(`Errore: ${error.message}`);
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
        this.elements.action.value = 'auto';
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