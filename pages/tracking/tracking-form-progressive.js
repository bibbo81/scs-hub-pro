function createCarrierDropdown() {
    const container = document.querySelector('.carrier-dropdown-container') || 
                     document.querySelector('#carrier-select').parentElement;
    
    if (!container) {
        console.error('Container carrier non trovato');
        return;
    }
    
    // Crea wrapper per dropdown dinamici
    container.innerHTML = `
        <div class="carrier-dropdown-wrapper">
            <select id="carrier-awb" class="form-control carrier-select" style="display: none;">
                <option value="">Seleziona vettore AWB...</option>
            </select>
            
            <select id="carrier-container" class="form-control carrier-select" style="display: none;">
                <option value="">Seleziona vettore container...</option>
            </select>
            
            <select id="carrier-bl" class="form-control carrier-select" style="display: none;">
                <option value="">Seleziona vettore BL...</option>
            </select>
        </div>
    `;
    
    // Popola tutti i dropdown
    const awbDropdown = document.getElementById('carrier-awb');
    const containerDropdown = document.getElementById('carrier-container');
    const blDropdown = document.getElementById('carrier-bl');
    
    // AWB con prefissi IATA
    const awbCarriers = getCarriersByType('awb');
    awbCarriers.forEach(carrier => {
        const option = document.createElement('option');
        option.value = carrier.iata;
        option.textContent = carrier.display || `${carrier.name} (${carrier.iata})`;
        option.setAttribute('data-name', carrier.name);
        awbDropdown.appendChild(option);
    });
    
    // Container carriers
    const containerCarriers = getCarriersByType('container');
    containerCarriers.forEach(carrier => {
        const option = document.createElement('option');
        option.value = carrier.code;
        option.textContent = carrier.name;
        containerDropdown.appendChild(option);
    });
    
    // BL carriers
    const blCarriers = getCarriersByType('bl');
    blCarriers.forEach(carrier => {
        const option = document.createElement('option');
        option.value = carrier.code;
        option.textContent = carrier.name;
        blDropdown.appendChild(option);
    });
    
    // Mostra dropdown corretto in base al tipo
    function showCorrectDropdown(type) {
        [awbDropdown, containerDropdown, blDropdown].forEach(el => el.style.display = 'none');
        
        const targetDropdown = document.getElementById(`carrier-${type}`);
        if (targetDropdown) {
            targetDropdown.style.display = 'block';
        }
    }
    
    // Listener per cambio tipo
    const typeRadios = document.querySelectorAll('input[name="trackingType"]');
    typeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            showCorrectDropdown(e.target.value);
            
            // Auto-detect tracking number se presente
            const trackingInput = document.getElementById('trackingNumber');
            if (trackingInput && trackingInput.value) {
                autoDetectCarrier(trackingInput.value);
            }
        });
    });
    
    // Inizializza con container
    showCorrectDropdown('container');
    
    console.log('✅ Carrier dropdown creato con prefissi IATA completi');
}

document.addEventListener('DOMContentLoaded', () => {
    // The initialization is now handled by the form creation flow
    // to prevent errors on page load.
});