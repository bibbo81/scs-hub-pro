// /pages/shipments/index.js

let cachedShipments = []; // variabile globale locale

/**
 * Renderizza la tabella delle spedizioni.
 * @param {Array} shipments - L'array di spedizioni da visualizzare.
 * @returns {string} L'HTML della tabella.
 */
function renderShipmentsTable(shipments) {
  if (!shipments || shipments.length === 0) {
    return `<div class="sol-alert sol-alert-info"><i class="fas fa-info-circle"></i> Nessun risultato per la ricerca.</div>`;
  }

  const tableHeaders = `
    <thead>
      <tr>
        <th>Shipment #</th>
        <th>Tracking #</th>
        <th>Carrier</th>
        <th>Status</th>
        <th>Origin</th>
        <th>Destination</th>
        <th>ETA</th>
      </tr>
    </thead>
  `;

  const tableRows = shipments.map(s => `
    <tr>
      <td>${s.shipment_number || 'N/A'}</td>
      <td>${s.tracking_number || 'N/A'}</td>
      <td>${s.carrier_name || 'N/A'}</td>
      <td><span class="sol-badge sol-badge-primary">${s.status || 'Unknown'}</span></td>
      <td>${s.origin || 'N/A'}</td>
      <td>${s.destination || 'N/A'}</td>
      <td>${s.eta ? new Date(s.eta).toLocaleDateString('it-IT') : 'N/A'}</td>
    </tr>
  `).join('');

  return `
    <div class="sol-table-container">
      <table class="sol-table">
        ${tableHeaders}
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;
}

async function initializeShipmentsPage() {
  try {
    // Attendi che dataManager sia pronto
    await new Promise(resolve => {
      if (window.dataManager?.initialized) resolve();
      else window.addEventListener('dataManagerReady', resolve, { once: true });
    });

    // Carica le spedizioni iniziali
    cachedShipments = await window.dataManager.getShipments();

    // Renderizza la tabella iniziale
    renderShipmentsTable(cachedShipments);

    // Gestione ricerca dinamica
    const searchInput = document.getElementById('shipments-search');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        const query = e.target.value.trim().toLowerCase();
        const filtered = cachedShipments.filter(shipment =>
          shipment.reference?.toLowerCase().includes(query) ||
          shipment.tracking_number?.toLowerCase().includes(query) ||
          shipment.carrier?.toLowerCase().includes(query)
        );
        renderShipmentsTable(filtered);
      });
    }
  } catch (err) {
    console.error('Errore inizializzazione pagina spedizioni:', err);
    document.getElementById('shipments-app').textContent = 'Errore nel caricamento delle spedizioni.';
  }
}

// Assicurati di chiamare initializeShipmentsPage() all'avvio
initializeShipmentsPage();
