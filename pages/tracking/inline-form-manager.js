// /pages/tracking/inline-form-manager.js

class InlineFormManager {
    constructor() {
        this.elements = {
            trackingNumber: document.getElementById('inline-tracking-number'),
            action: document.getElementById('inline-tracking-action'),
            origin: document.getElementById('inline-origin'),
            destination: document.getElementById('inline-destination'),
            submitBtn: document.getElementById('inline-submit-btn'),
            preview: document.getElementById('inline-live-preview')
        };
        this.detectionTimeout = null;
    }

    init() {
        if (!this.elements.trackingNumber) {
            console.warn('Inline form elements not found. Aborting init.');
            return;
        }
        console.log('🚀 Initializing Inline Form Manager...');
        this.attachEventListeners();
    }

    attachEventListeners() {
        this.elements.trackingNumber.addEventListener('input', () => {
            clearTimeout(this.detectionTimeout);
            this.detectionTimeout = setTimeout(() => this.updateLivePreview(), 500);
        });

        this.elements.action.addEventListener('change', () => this.updateLivePreview());
        this.elements.submitBtn.addEventListener('click', () => this.handleSubmit());
    }

    async updateLivePreview() {
        const trackingNumber = this.elements.trackingNumber.value.trim();
        if (!trackingNumber) {
            this.elements.preview.innerHTML = '<p class="text-muted">Inserisci un numero di tracking...</p>';
            return;
        }

        this.elements.preview.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Rilevamento...</p>';

        try {
            const type = await window.detectTrackingType(trackingNumber);
            const typeLabel = type === 'awb' ? 'Aereo (AWB)' : 'Marittimo (Container/BL)';
            const actionLabel = this.elements.action.value === 'get' ? 'Recupera dati esistenti' : 'Registra nuovo tracking';

            this.elements.preview.innerHTML = `
                <p><strong>Numero:</strong> ${trackingNumber}</p>
                <p><strong>Tipo Rilevato:</strong> ${typeLabel}</p>
                <p><strong>Azione:</strong> ${actionLabel}</p>
                <p class="text-success"><i class="fas fa-check-circle"></i> Pronto per l'invio.</p>
            `;
        } catch (error) {
            this.elements.preview.innerHTML = '<p class="text-danger"><i class="fas fa-exclamation-circle"></i> Errore nel rilevamento.</p>';
        }
    }

    async handleSubmit() {
        const trackingNumber = this.elements.trackingNumber.value.trim();
        const action = this.elements.action.value;
        const origin = this.elements.origin.value.trim();
        const destination = this.elements.destination.value.trim();

        if (!trackingNumber) {
            window.NotificationSystem?.error('Il numero di tracking è obbligatorio.');
            return;
        }

        this.elements.submitBtn.disabled = true;
        this.elements.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const type = await window.detectTrackingType(trackingNumber);
            
            const trackingData = {
                tracking_number: trackingNumber,
                tracking_type: type,
                origin: origin,
                destination: destination,
                status: 'registered'
            };

            console.log(`Submitting with action: ${action}`, trackingData);

            if (!window.dataManager) {
                throw new Error("DataManager non è disponibile.");
            }

            // Usiamo il dataManager per aggiungere il tracking.
            // La logica API (POST/GET) è gestita internamente da tracking-upsert-utility.
            const result = await window.dataManager.addTracking(trackingData, {
                // Passiamo l'operazione desiderata all'utility di upsert
                apiOperation: action 
            });

            if (result.tracking) {
                window.NotificationSystem?.success(`Tracking ${action === 'get' ? 'recuperato' : 'aggiunto'} con successo!`);
                this.resetForm();
                
                // Ricarica la tabella principale
                if (window.loadTrackings) {
                    window.loadTrackings();
                }
            } else {
                throw new Error(result.error || "Errore sconosciuto durante l'aggiunta del tracking.");
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
        this.elements.action.value = 'auto';
        this.elements.preview.innerHTML = '<p class="text-muted">Inserisci un numero di tracking per vedere l\'anteprima.</p>';
        
        // Chiudi i dettagli se aperti
        const collapse = document.getElementById('collapseDetails');
        if (collapse.classList.contains('show')) {
            $(collapse).collapse('hide');
        }
    }
}

// Inizializza il manager quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.inlineFormManager = new InlineFormManager();
    window.inlineFormManager.init();
});