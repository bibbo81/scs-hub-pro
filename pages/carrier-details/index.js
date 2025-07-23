import dataManager from '/core/services/data-manager.js';
import notificationSystem from '/core/notification-system.js';
import headerComponent from '/core/header-component.js';

document.addEventListener('DOMContentLoaded', async () => {
    await headerComponent.init();
    await dataManager.init();

    const carrierId = getCarrierIdFromURL();
    if (!carrierId) {
        notificationSystem.error("ID Spedizioniere non trovato nell'URL.");
        document.body.innerHTML += '<p>Errore: ID spedizioniere mancante.</p>';
        return;
    }

    loadCarrierDetails(carrierId);
});

function getCarrierIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadCarrierDetails(carrierId) {
    try {
        const carrierDetails = await dataManager.getCarrierDetails(carrierId);

        if (!carrierDetails) {
            notificationSystem.error("Spedizioniere non trovato.");
            return;
        }

        renderHeader(carrierDetails);
        renderStats(carrierDetails);
        renderShipmentsTable(carrierDetails.shipments);

    } catch (error) {
        console.error("Errore caricamento dettagli spedizioniere:", error);
        notificationSystem.error("Impossibile caricare i dettagli dello spedizioniere.");
    }
}

function renderHeader(carrier) {
    document.getElementById('carrierNameTitle').textContent = carrier.name || 'Dettaglio Spedizioniere';
}

function renderStats(carrier) {
    const shipments = carrier.shipments || [];
    const shipmentCount = shipments.length;
    const totalSpent = shipments.reduce((sum, s) => sum + (s.total_cost || 0), 0);
    const averageCost = shipmentCount > 0 ? totalSpent / shipmentCount : 0;

    document.getElementById('statShipmentCount').textContent = shipmentCount;
    document.getElementById('statTotalSpent').textContent = formatCurrency(totalSpent);
    document.getElementById('statAverageCost').textContent = formatCurrency(averageCost);
}

function renderShipmentsTable(shipments) {
    const tbody = document.getElementById('shipmentsTableBody');
    tbody.innerHTML = '';

    if (!shipments || shipments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nessuna spedizione trovata per questo spedizioniere.</td></tr>';
        return;
    }

    shipments.forEach(shipment => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <a href="/shipment-details.html?id=${shipment.id}" class="font-weight-bold text-primary">
                    ${shipment.shipment_number || 'N/D'}
                </a>
            </td>
            <td>${formatStatus(shipment.status)}</td>
            <td>${shipment.origin || '-'}</td>
            <td>${shipment.destination || '-'}</td>
            <td>${formatCurrency(shipment.total_cost)}</td>
            <td>${new Date(shipment.created_at).toLocaleDateString('it-IT')}</td>
        `;
        tbody.appendChild(tr);
    });
}

function formatCurrency(value) {
    if (typeof value !== 'number') return '€ 0,00';
    return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function formatStatus(rawStatus) {
    // Utilizza la mappatura unificata per coerenza
    const statusKey = window.TrackingUnifiedMapping.mapStatus(rawStatus || 'registered');
    const displayConfig = window.TrackingUnifiedMapping.STATUS_DISPLAY_CONFIG;
    const config = displayConfig[statusKey] || displayConfig['default'];
    
    // Usa la classe CSS corretta dal mapping (es. 'badge-info', 'badge-success')
    return `<span class="badge badge-${config.class}"><i class="fas ${config.icon} mr-2"></i>${config.label}</span>`;
}