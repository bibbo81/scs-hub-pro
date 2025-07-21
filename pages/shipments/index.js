// /pages/shipments/index.js

let cachedShipments = []; // variabile globale locale

const STATUS_MAPPING = window.TrackingUnifiedMapping?.STATUS_MAPPING || {};

/**
 * Renderizza la tabella delle spedizioni.
 * @param {Array} shipments - L'array di spedizioni da visualizzare.
 * @returns {string} L'HTML della tabella.
 */
function renderShipmentsTable(shipments) {
  if (!shipments || shipments.length === 0) {
    return `<div class="sol-alert sol-alert-info"><i class="fas fa-info-circle"></i> Nessun risultato per la ricerca.</div>`;
  }

  // Usa la mappatura STATUS_DISPLAY da TrackingUnifiedMapping
  const STATUS_DISPLAY = window.TrackingUnifiedMapping?.STATUS_DISPLAY || {};

  const tableHeaders = `
    <thead>
      <tr>
        <th class="sortable">Numero Spedizione</th>
        <th class="sortable">Tracking</th>
        <th class="sortable">Stato</th>
        <th class="sortable">Origine</th>
        <th class="sortable">Destinazione</th>
        <th class="sortable">ETA</th>
        <th class="sortable">Compagnia</th>
        <th class="sortable">Container</th>
        <th class="sortable">Tipo</th>
        <th>Azioni</th>
      </tr>
    </thead>
  `;

  const tableRows = shipments.map(s => {
    const rawStatus = s.status || 'Unknown';
    // Normalizza lo stato usando la mappatura unificata
    const normalizedStatus = window.TrackingUnifiedMapping?.mapStatus(rawStatus) || 'registered';
    const displayInfo = STATUS_DISPLAY[normalizedStatus] || { label: rawStatus, class: 'secondary' };

    return `
    <tr>
      <td>${s.shipment_number || 'N/A'}</td>
      <td>${s.tracking_number || 'N/A'}</td>
      <td><span class="sol-badge sol-badge-${displayInfo.class}">${displayInfo.label}</span></td>
      <td>${s.origin || 'N/A'}</td>
      <td>${s.destination || 'N/A'}</td>
      <td>${s.eta ? new Date(s.eta).toLocaleDateString('it-IT') : 'N/A'}</td>
      <td>${s.carrier_name || 'N/A'}</td>
      <td>${s.container_size || 'N/A'}</td>
      <td>${s.container_type || 'N/A'}</td>
      <td>
        <button class="sol-btn sol-btn-sm" data-id="${s.id}">Dettagli</button>
      </td>
    </tr>
  `}).join('');

  return `
    <div class="table-container">
      <table class="data-table">
        ${tableHeaders}
        <tbody id="shipmentsTableBody">
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

    // AGGIUNGI CONTROLLO DI SICUREZZA
    if (!Array.isArray(cachedShipments)) {
        console.error('Dati delle spedizioni non validi. Previsto un array, ricevuto:', cachedShipments);
        document.getElementById('shipmentsTableBody').innerHTML = '<tr><td colspan="10" class="text-center text-danger">Errore: i dati delle spedizioni non sono stati caricati correttamente.</td></tr>';
        return; // Interrompi l'esecuzione per prevenire altri errori
    }

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

async function refreshTrackingTable() {
    const { data: trackings, error } = await supabase.from('trackings').select('*');

    if (error) {
        NotificationSystem.error("Errore caricamento tracking");
        return;
    }

    const tbody = document.getElementById('trackingTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';  // Pulisci tabella precedente

    trackings.forEach(tracking => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${tracking.tracking_number || 'N/A'}</td>
            <td>${tracking.carrier || 'N/A'}</td>
            <td><span class="badge badge-info">${tracking.status || 'Unknown'}</span></td>
            <td>${tracking.origin || 'N/A'}</td>
            <td>${tracking.destination || 'N/A'}</td>
            <td>${tracking.updated_at ? new Date(tracking.updated_at).toLocaleString('it-IT') : 'N/A'}</td>
            <td class="action-buttons">
                <button class="btn-icon text-danger" onclick="confirmDeleteTracking('${tracking.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function confirmDeleteTracking(id) {
    if (confirm("⚠️ Attenzione: cancellando questo record, sarà eliminato anche dalle spedizioni correlate. Continuare?")) {
        deleteTracking(id);
    }
}

async function deleteTracking(id) {
    const { error } = await supabase.from('trackings').delete().eq('id', id);

    if (error) {
        NotificationSystem.error("Errore eliminazione tracking");
        return;
    }

    NotificationSystem.success("Tracking eliminato con successo");
    refreshTrackingTable();
}

// Assicurati di chiamare initializeShipmentsPage() all'avvio
initializeShipmentsPage();

