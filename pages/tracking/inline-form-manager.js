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
    }

    attachEventListeners() {
        this.elements.trackingNumber.addEventListener('input', () => {
            clearTimeout(this.detectionTimeout);
            this.detectionTimeout = setTimeout(() => this.handleTrackingNumberInput(), 500);
        });

        this.elements.submitBtn.addEventListener('click', () => this.handleSubmit());
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
                    <p class="text-success"><i class="fas fa-check-circle"></i> Pronto per l'invio.</p>
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
            // Step 1: Get enriched data from TrackingService
            console.log('Step 1: Fetching data from TrackingService...');
            const apiResult = await window.trackingService.track(
                trackingNumber,
                this.detectedType,
                {
                    operation: action, // 'auto', 'get', or 'post'
                    carrier: carrier,
                    shipsgoId: this.detectedOceanShipment?.id // Pass Ocean ID if available
                }
            );

            if (!apiResult || !apiResult.success) {
                throw new Error(apiResult.apiError || 'Impossibile recuperare i dati dall\'API.');
            }
            console.log('API Result:', apiResult);

            // Step 2: Prepare data for saving. Merge API data with form data.
            const dataToSave = {
                ...(apiResult.metadata?.mapped || {}),
                tracking_number: trackingNumber,
                tracking_type: this.detectedType,
                carrier_code: apiResult.carrier?.code || carrier,
                carrier_name: apiResult.carrier?.name || carrier,
                origin_port: origin || apiResult.route?.origin?.port,
                destination_port: destination || apiResult.route?.destination?.port,
                reference_number: reference || apiResult.metadata?.reference,
                status: apiResult.status || 'registered',
                metadata: apiResult.metadata // Store the full raw and mapped data
            };

            console.log('Step 2: Data prepared for saving:', dataToSave);

            // Step 3: Save to database via DataManager
            if (!window.dataManager) {
                throw new Error("DataManager non è disponibile.");
            }
            console.log('Step 3: Saving data via DataManager...');
            const saveResult = await window.dataManager.addTracking(dataToSave);

            if (saveResult.tracking) {
                window.NotificationSystem?.success(`Tracking ${action === 'get' ? 'recuperato' : 'aggiunto'} con successo!`);
                this.resetForm();
                
                // Step 4: Update UI instantly
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