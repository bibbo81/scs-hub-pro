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
            submitBtn: document.getElementById('inline-submit-btn'),
            preview: document.getElementById('inline-live-preview'),
            detailsSection: document.getElementById('inline-details-section'),
        };
        this.detectionTimeout = null;
        this.detectedType = null;
        this.detectedOceanShipment = null;
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
            return;
        }

        try {
            const { data, error } = await window.supabase
                .from('vehicle_types')
                .select('id, name')
                .eq('transport_mode_id', transportModeId);

            if (error) throw error;

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

        if (!trackingNumber) {
            window.NotificationSystem?.error('Il numero di tracking è obbligatorio.');
            return;
        }
        if (!carrier) {
            window.NotificationSystem?.error('Il carrier è obbligatorio.');
            return;
        }

        this.elements.submitBtn.disabled = true;
        this.elements.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Elaborazione...';

        try {
            // Step 1: Get the fully normalized and enriched data from the service.
            // The service now handles all complex mapping.
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
                    vehicle_type_id: vehicleTypeId
                }
            );

            if (!result || !result.success) {
                throw new Error(result.apiError || 'Impossibile recuperare i dati dall\'API.');
            }
            console.log('Service Result (fully mapped):', result);

            // Step 2: The 'result' object is now the data to save. No more mapping needed here.
            const dataToSave = { ...result };
            delete dataToSave.success; // Remove the success flag before saving

            console.log('Step 2: Data ready for saving:', dataToSave);

            // Step 3: Save to database via DataManager
            if (!window.dataManager) {
                throw new Error("DataManager non è disponibile.");
            }
            console.log('Step 3: Saving data via DataManager...');
            const saveResult = await window.dataManager.addTracking(dataToSave);

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

        const collapse = document.getElementById('collapseDetails');
        if (collapse && collapse.classList.contains('show')) {
            $(collapse).collapse('hide');
        }
    }
}

// Inizializza il manager quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.inlineFormManager = new InlineFormManager();
    window.inlineFormManager.init();
});