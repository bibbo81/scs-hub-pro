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
    document.getElementById('shipmentTotalCost').textContent = formatCurrency(shipment.total_cost);
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Nessun prodotto associato.</td></tr>';
        return;
    }
    // ... (codice esistente)
}

async function renderDocumentsTable(documents) {
    const tbody = document.getElementById('documentsTableBody');
    tbody.innerHTML = '';
    if (!documents || documents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nessun documento caricato.</td></tr>';
        return;
    }
    for (const doc of documents) {
        const signedUrl = await dataManager.getPublicFileUrl(doc.file_path);
        const tr = document.createElement('tr');
        tr.dataset.documentId = doc.id;
        tr.innerHTML = `
            <td><a href="${signedUrl || '#'}" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-alt mr-2 text-primary"></i>${doc.document_name}</a></td>
            <td>${doc.document_type || '-'}</td>
            <td>${formatDate(doc.created_at)}</td>
            <td>${doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '-'}</td>
            <td>
                <button class="sol-btn sol-btn-secondary sol-btn-sm download-document-btn" title="Scarica"><i class="fas fa-download"></i></button>
                <button class="sol-btn sol-btn-primary sol-btn-sm replace-document-btn" title="Sostituisci"><i class="fas fa-exchange-alt"></i></button>
                <button class="sol-btn sol-btn-danger sol-btn-sm delete-document-btn" title="Elimina"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

function setupEventListeners() {
    document.getElementById('addProductBtn')?.addEventListener('click', addProduct);
    document.getElementById('uploadDocumentBtn')?.addEventListener('click', uploadDocument);
    document.getElementById('changeCarrierBtn')?.addEventListener('click', changeShipmentCarrier);

    document.getElementById('productsTableBody')?.addEventListener('click', (event) => {
        // ... (codice esistente)
    });

    document.getElementById('documentsTableBody')?.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const documentId = button.closest('tr').dataset.documentId;
        if (button.classList.contains('delete-document-btn')) deleteDocument(documentId);
        else if (button.classList.contains('replace-document-btn')) replaceDocument(documentId);
        else if (button.classList.contains('download-document-btn')) downloadDocument(documentId);
    });
}

async function changeShipmentCarrier() {
    try {
        const carriers = await dataManager.getCarriers();
        if (!carriers || carriers.length === 0) {
            notificationSystem.info('Nessun corriere disponibile. Creane uno nella pagina Corrieri.');
            return;
        }

        const modalContent = `
            <div class="sol-form">
                <div class="sol-form-group">
                    <label for="carrierSelect" class="sol-form-label">Seleziona un corriere</label>
                    <select id="carrierSelect" class="sol-form-input">
                        ${carriers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;

        ModalSystem.show({
            title: 'Cambia Corriere',
            content: modalContent,
            buttons: [
                { text: 'Annulla', class: 'sol-btn sol-btn-secondary', onclick: () => ModalSystem.close() },
                {
                    text: 'Salva',
                    class: 'sol-btn sol-btn-primary',
                    onclick: async () => {
                        const selectedCarrierId = document.getElementById('carrierSelect').value;
                        const shipmentId = getShipmentIdFromURL();
                        try {
                            notificationSystem.info('Aggiornamento corriere...');
                            await dataManager.updateShipmentCarrier(shipmentId, selectedCarrierId);
                            notificationSystem.success('Corriere aggiornato con successo!');
                            loadShipmentDetails(shipmentId);
                            return true;
                        } catch (error) {
                            notificationSystem.error(`Errore: ${error.message}`);
                            return false;
                        }
                    }
                }
            ]
        });
    } catch (error) {
        notificationSystem.error('Impossibile caricare la lista dei corrieri.');
    }
}

// ... (tutte le altre funzioni rimangono invariate)

async function uploadDocument() { /* ... */ }
async function deleteDocument(documentId) { /* ... */ }
function replaceDocument(documentId) { /* ... */ }
async function downloadDocument(documentId) { /* ... */ }
function editProduct(productId) { /* ... */ }
async function deleteProduct(productId) { /* ... */ }
async function addProduct() { /* ... */ }
function formatCurrency(value) { /* ... */ }
function formatWeight(value) { /* ... */ }
function formatVolume(value) { /* ... */ }
function formatDate(dateString) { /* ... */ }
function formatStatus(rawStatus) { /* ... */ }
