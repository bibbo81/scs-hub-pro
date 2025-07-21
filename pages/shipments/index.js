// /pages/shipments/index.js

let cachedShipments = []; // variabile globale locale

const STATUS_MAPPING = {
    // === CONTAINER/SEA STATUSES ===
    // English
    'Sailing': 'in_transit',
    'In Transit': 'in_transit',
    'Loaded': 'in_transit',
    'Loading': 'in_transit',
    'Gate In': 'in_transit',
    'Transhipment': 'in_transit',
    'Arrived': 'arrived',
    'Discharged': 'arrived',
    'Discharging': 'arrived',
    'Gate Out': 'out_for_delivery',
    'Delivered': 'delivered',
    'Empty': 'delivered',
    'Empty Returned': 'delivered',
    'POD': 'delivered',
    'Registered': 'registered',
    'Pending': 'registered',
    'Booked': 'registered',
    'Booking Confirmed': 'registered',
    
    // Italian
    'In transito': 'in_transit',
    'In Transito': 'in_transit',
    'Navigando': 'in_transit',
    'Caricato': 'in_transit',
    'In caricamento': 'in_transit',
    'Arrivato': 'arrived',
    'Arrivata': 'arrived',
    'Scaricato': 'arrived',
    'In scarico': 'arrived',
    'In consegna': 'out_for_delivery',
    'Consegnato': 'delivered',
    'Consegnata': 'delivered',
    'Vuoto': 'delivered',
    'Registrato': 'registered',
    'In attesa': 'registered',
    'Prenotato': 'registered',
    
    // === AWB/AIR STATUSES ===
    // English codes
    'RCS': 'registered',
    'MAN': 'in_transit',
    'DEP': 'in_transit',
    'ARR': 'arrived',
    'RCF': 'arrived',
    'NFD': 'out_for_delivery',
    'DLV': 'delivered',
    'DELIVERED': 'delivered',
    'INPROGRESS': 'in_transit',
    'IN PROGRESS': 'in_transit',
    'PENDING': 'registered',
    
    // === COURIER STATUSES (Italian) ===
    'La spedizione è stata consegnata': 'delivered',
    'Consegnata.': 'delivered',
    'Consegna prevista nel corso della giornata odierna.': 'out_for_delivery',
    'La spedizione è in consegna': 'out_for_delivery',
    'La spedizione è in transito': 'in_transit',
    'Arrivata nella sede GLS locale.': 'in_transit',
    'In transito.': 'in_transit',
    'Partita dalla sede mittente. In transito.': 'in_transit',
    'La spedizione e\' stata creata dal mittente': 'registered',
    
    // FedEx
    'On FedEx vehicle for delivery': 'out_for_delivery',
    'At local FedEx facility': 'in_transit',
    'Departed FedEx hub': 'in_transit',
    'On the way': 'in_transit',
    'Arrived at FedEx hub': 'in_transit',
    'At destination sort facility': 'in_transit',
    'Left FedEx origin facility': 'in_transit',
    'Picked up': 'in_transit',
    'Shipment information sent to FedEx': 'registered',
    'International shipment release - Import': 'customs_cleared',
    
    // Customs
    'Customs Cleared': 'customs_cleared',
    'Sdoganato': 'customs_cleared',
    'Sdoganata': 'customs_cleared',
    'In dogana': 'customs_hold',
    'Customs Hold': 'customs_hold',
    
    // Exceptions
    'Delayed': 'delayed',
    'In ritardo': 'delayed',
    'Ritardo': 'delayed',
    'Exception': 'exception',
    'Eccezione': 'exception',
    'Cancelled': 'cancelled',
    'Annullato': 'cancelled'
};

/**
 * Renderizza la tabella delle spedizioni.
 * @param {Array} shipments - L'array di spedizioni da visualizzare.
 * @returns {string} L'HTML della tabella.
 */
function renderShipmentsTable(shipments) {
  if (!shipments || shipments.length === 0) {
    return `<div class="sol-alert sol-alert-info"><i class="fas fa-info-circle"></i> Nessun risultato per la ricerca.</div>`;
  }

  // Definisci qui la mappa per la visualizzazione degli stati, per semplicità
  const STATUS_DISPLAY = {
    'in_transit': { label: 'In Transito', class: 'primary' },
    'delivered': { label: 'Consegnato', class: 'success' },
    'registered': { label: 'Registrato', class: 'info' },
    'customs_cleared': { label: 'Sdoganato', class: 'success' },
    'out_for_delivery': { label: 'In Consegna', class: 'warning' },
    'arrived': { label: 'Arrivato', class: 'primary' },
    'delayed': { label: 'In Ritardo', class: 'danger' },
    'exception': { label: 'Eccezione', class: 'warning' },
    'pending': { label: 'In attesa', class: 'warning' }
  };

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
    const normalizedStatus = STATUS_MAPPING[rawStatus] || 'registered'; // Usa la mappa di normalizzazione
    const displayInfo = STATUS_DISPLAY[normalizedStatus] || { label: rawStatus, class: 'secondary' }; // Usa la mappa di visualizzazione

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
  const tableContainer = document.querySelector('.sol-card-body .table-container');

  try {
    await new Promise(resolve => {
      if (window.dataManager?.initialized) return resolve();
      window.addEventListener('dataManagerReady', resolve, { once: true });
      setTimeout(() => resolve(), 2000); // Timeout di sicurezza
    });

    if (!window.dataManager) {
        throw new Error("Data Manager non disponibile.");
    }

    const shipments = await window.dataManager.getShipments();

    if (!Array.isArray(shipments)) {
      console.error("La funzione getShipments non ha restituito un array:", shipments);
      if(tableContainer) tableContainer.innerHTML = `<div class="sol-alert sol-alert-danger">Errore nel caricamento dei dati delle spedizioni.</div>`;
      return;
    }

    if(tableContainer) tableContainer.innerHTML = renderShipmentsTable(shipments);

  } catch (error) {
    console.error('Errore critico durante l'inizializzazione delle spedizioni:', error);
    if(tableContainer) tableContainer.innerHTML = `<div class="sol-alert sol-alert-danger">Impossibile caricare le spedizioni: ${error.message}</div>`;
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

