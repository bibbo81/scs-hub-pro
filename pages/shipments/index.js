let cachedShipments = []; // variabile globale locale

const STATUS_MAPPING = {
    // ... (la mappatura rimane la stessa)
};

function renderShipmentsTable(shipments) {
    // ... (la funzione di rendering rimane la stessa)
}

async function initializeShipmentsPage() {
  try {
    if (!window.dataManager?.initialized) {
        console.warn('Attesa del dataManager...');
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!window.dataManager?.initialized) throw new Error('DataManager non disponibile.');
    }

    cachedShipments = await window.dataManager.getShipments();

    if (!Array.isArray(cachedShipments)) {
        console.error('Dati delle spedizioni non validi. Previsto un array, ricevuto:', cachedShipments);
        const tableBody = document.getElementById('shipmentsTableBody');
        if(tableBody) tableBody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Errore: i dati non sono stati caricati.</td></tr>';
        return;
    }

    const tableContainer = document.querySelector('.sol-card-body .table-container');
    if(tableContainer) tableContainer.innerHTML = renderShipmentsTable(cachedShipments);

  } catch (err) {
    console.error('Errore inizializzazione pagina spedizioni:', err);
    const appContainer = document.querySelector('.sol-card-body');
    if(appContainer) appContainer.innerHTML = '<div class="sol-alert sol-alert-danger">Errore critico nel caricamento delle spedizioni.</div>';
  }
}

// Esporta l'oggetto con la funzione per essere chiamato da shipments.html
export default { initializeShipmentsPage };
