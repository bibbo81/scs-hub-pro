import dataManager from '/core/services/data-manager.js';
import notificationSystem from '/core/notification-system.js';
import headerComponent from '/core/header-component.js';
import ModalSystem from '/core/modal-system.js';

document.addEventListener('DOMContentLoaded', async () => {
    await headerComponent.init();
    await dataManager.init();

    const shipmentId = getShipmentIdFromURL();
    if (!shipmentId) {
        notificationSystem.error("ID Spedizione non trovato nell'URL.");
        return;
    }

    loadShipmentDetails(shipmentId);
    setupEventListeners();
});

function getShipmentIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadShipmentDetails(shipmentId) {
    try {
        const shipmentDetails = await dataManager.getShipmentDetails(shipmentId);
        if (!shipmentDetails) {
            notificationSystem.error("Spedizione non trovata.");
            return;
        }
        renderShipmentInfo(shipmentDetails);
        renderProductsTable(shipmentDetails.products);
        await renderDocumentsTable(shipmentDetails.documents);
    } catch (error) {
        console.error("Errore caricamento dettagli spedizione:", error);
        notificationSystem.error("Impossibile caricare i dettagli della spedizione.");
    }
}

function renderShipmentInfo(shipment) {
    document.getElementById('shipmentNumberTitle').textContent = `Spedizione ${shipment.shipment_number || ''}`;
    document.getElementById('shipmentNumber').textContent = shipment.shipment_number || '-';
    document.getElementById('shipmentStatus').innerHTML = formatStatus(shipment.status);
    document.getElementById('shipmentDate').textContent = formatDate(shipment.created_at);
    document.getElementById('shipmentOrigin').textContent = shipment.origin || '-';
    document.getElementById('shipmentDestination').textContent = shipment.destination || '-';
    document.getElementById('shipmentCarrier').textContent = shipment.carrier?.name || 'N/A';
    
    // Popola i nuovi campi costo
    const freightCostInput = document.getElementById('freightCost');
    const otherCostsInput = document.getElementById('otherCosts');
    freightCostInput.value = shipment.freight_cost || 0;
    otherCostsInput.value = shipment.other_costs || 0;
    updateTotalCost(); // Calcola e mostra il totale
}

function updateTotalCost() {
    const freightCost = parseFloat(document.getElementById('freightCost').value) || 0;
    const otherCosts = parseFloat(document.getElementById('otherCosts').value) || 0;
    const totalCost = freightCost + otherCosts;
    document.getElementById('shipmentTotalCost').textContent = formatCurrency(totalCost);
}

function setupEventListeners() {
    document.getElementById('addProductBtn')?.addEventListener('click', addProduct);
    document.getElementById('uploadDocumentBtn')?.addEventListener('click', uploadDocument);
    document.getElementById('changeCarrierBtn')?.addEventListener('click', changeShipmentCarrier);
    document.getElementById('saveCostsBtn')?.addEventListener('click', saveCosts);

    // Listener per aggiornare il totale in tempo reale
    document.getElementById('freightCost').addEventListener('input', updateTotalCost);
    document.getElementById('otherCosts').addEventListener('input', updateTotalCost);

    // ... (altri listener)
}

async function saveCosts() {
    const shipmentId = getShipmentIdFromURL();
    const freightCost = parseFloat(document.getElementById('freightCost').value) || 0;
    const otherCosts = parseFloat(document.getElementById('otherCosts').value) || 0;

    try {
        notificationSystem.info('Salvataggio dei costi in corso...');
        await dataManager.updateShipmentCosts(shipmentId, freightCost, otherCosts);
        notificationSystem.success('Costi salvati con successo!');
        loadShipmentDetails(shipmentId); // Ricarica per conferma
    } catch (error) {
        notificationSystem.error(`Errore durante il salvataggio: ${error.message}`);
    }
}

// ... (tutte le altre funzioni rimangono invariate)