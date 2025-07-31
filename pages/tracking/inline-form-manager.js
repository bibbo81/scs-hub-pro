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
            // Using jQuery as it's available on the page for collapse
            $(collapse).collapse('show');
        }
 
        // The tracking number is optional only for manual action.
        // The placeholder will be updated to reflect this.
        if (isManual) {
            this.elements.trackingNumber.placeholder = 'Opzionale, generato se vuoto';
        } else {
            this.elements.trackingNumber.placeholder = 'Inserisci numero...';
        }

        // Reset values when switching from manual to auto/get
        if (!isManual) {
            this.elements.eta.value = '';
            this.elements.trackingType.value = '';
            this.elements.totalWeight.value = '';
            this.elements.totalVolume.value = '';
            this.elements.blNumber.value = '';
            this.elements.flightNumber.value = '';        }
    }

    handleTrackingTypeChange() {
        const trackingType = this.elements.trackingType.value;
        const isManualAction = this.elements.action.value === 'manual';

        if (isManualAction) {
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

        // If mode is 'Road', hide the tracking type selector and default it to 'manual'
        if (transportModeName === 'Road') {
            this.elements.trackingType.closest('.form-group').style.display = 'none';
            this.elements.trackingType.value = 'manual';
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
        console.log(`[Debug] handleVehicleTypeChange triggered. vehicleTypeId: ${vehicleTypeId}`);

        const selectedVehicleType = this.vehicleTypesData.find(type => type.id == vehicleTypeId); // Use == for type coercion
        const isManualAction = this.elements.action.value === 'manual';

        console.log(`[Debug] isManualAction: ${isManualAction}`);
        console.log('[Debug] selectedVehicleType:', selectedVehicleType);

        if (isManualAction && selectedVehicleType) {
            console.log('[Debug] Applying default values:', selectedVehicleType);
            this.elements.totalWeight.value = selectedVehicleType.default_kg || '';
            this.elements.totalVolume.value = selectedVehicleType.default_cbm || '';
            this.elements.totalWeight.readOnly = true;
            this.elements.totalVolume.readOnly = true;
        } else {
            console.log('[Debug] Clearing or ignoring default values.');
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

    async handleSubmit() {
        const action = this.elements.action.value;
        let trackingNumber = this.elements.trackingNumber.value.trim().toUpperCase();

        // If manual and no tracking number, create a placeholder to satisfy DB constraints
        if (action === 'manual' && !trackingNumber) {
            trackingNumber = `MANUAL-${Date.now()}`;
        }

        // Basic validation
        if (!trackingNumber) {
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
        const trackingType = this.elements.trackingType.value; // Get tracking type
        const eta = this.elements.eta.value;
        const totalWeight = this.elements.totalWeight.value;
        const totalVolume = this.elements.totalVolume.value;
        const blNumber = this.elements.blNumber.value;
        const flightNumber = this.elements.flightNumber.value;

        this.elements.submitBtn.disabled = true;
        this.elements.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Elaborazione...';

        try {
            let dataToSave = {};

            if (action === 'manual') {
                // For manual entry, directly construct the data object
                dataToSave = {
                    tracking_number: trackingNumber,
                    carrier: carrier,
                    tracking_type: trackingType || 'manual',
                    reference_number: reference,
                    origin: origin,
                    destination: destination,
                    status: 'pending', // Default status for manual entries
                    eta: eta,
                    total_weight_kg: parseFloat(totalWeight) || null,
                    total_volume_cbm: parseFloat(totalVolume) || null,
                    transport_mode_id: transportModeId || null,
                    vehicle_type_id: vehicleTypeId || null,
                    bl_number: blNumber,
                    flight_number: flightNumber,
                };

                // Basic validation for manual fields
                if (!dataToSave.tracking_type) {
                    window.NotificationSystem?.error("Tipo di Tracking è obbligatorio per l'inserimento manuale.");
                    // re-enable button
                    this.elements.submitBtn.disabled = false;
                    this.elements.submitBtn.innerHTML = 'Aggiungi'; // Restore button text
                    return;
                }
                if (dataToSave.tracking_type === 'container' && !dataToSave.bl_number) {
                    window.NotificationSystem?.error('B/L Number è obbligatorio per il tipo Marittimo.');
                    // re-enable button
                    this.elements.submitBtn.disabled = false;
                    this.elements.submitBtn.innerHTML = 'Aggiungi'; // Restore button text
                    return;
                }
                if (dataToSave.tracking_type === 'air_waybill' && !dataToSave.flight_number) {
                    window.NotificationSystem?.error('Numero Volo è obbligatorio per il tipo Aereo.');
                    // re-enable button
                    this.elements.submitBtn.disabled = false;
                    this.elements.submitBtn.innerHTML = 'Aggiungi'; // Restore button text
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

                if (!result || !result.success) throw new Error(result.apiError || 'Impossibile recuperare i dati dall\'API.');
                
                dataToSave = { ...result };
                delete dataToSave.success; // Remove the success flag before saving
                
                console.log('Service-based entry: Data ready for saving:', dataToSave);
            }

            if (!window.dataManager) {
                throw new Error("DataManager non è disponibile.");
            }
            console.log('Step 3: Saving data via DataManager...');
            const saveResult = await window.dataManager.addTracking(dataToSave, action === 'manual');

            if (saveResult.tracking) {
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