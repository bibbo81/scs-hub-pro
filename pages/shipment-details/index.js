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
        document.body.innerHTML += '<p>Errore: ID spedizione mancante.</p>';
        return;
    }

    loadShipmentDetails(shipmentId);
});

function getShipmentIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadShipmentDetails(shipmentId) {
    try {
        // Chiama la funzione aggiornata nel dataManager
        const shipmentDetails = await dataManager.getShipmentDetails(shipmentId);

        if (!shipmentDetails) {
            notificationSystem.error("Spedizione non trovata.");
            return;
        }

        renderShipmentInfo(shipmentDetails);
        renderProductsTable(shipmentDetails.products);
        renderDocumentsTable(shipmentDetails.documents);

    } catch (error) {
        console.error("Errore caricamento dettagli spedizione:", error);
        notificationSystem.error("Impossibile caricare i dettagli della spedizione.");
    }
}

function renderShipmentInfo(shipment) {
    document.getElementById('shipmentNumberTitle').textContent = `Spedizione ${shipment.shipment_number || ''}`;
    document.getElementById('shipmentNumber').textContent = shipment.shipment_number || '-';
    document.getElementById('shipmentStatus').innerHTML = formatStatus(shipment.status); // Usa innerHTML per il badge
    document.getElementById('shipmentDate').textContent = formatDate(shipment.created_at);
    document.getElementById('shipmentOrigin').textContent = shipment.origin || '-';
    document.getElementById('shipmentDestination').textContent = shipment.destination || '-';
    // Mostra il nome dello spedizioniere
    document.getElementById('shipmentCarrier').textContent = shipment.carrier?.name || '-';
    document.getElementById('shipmentTotalCost').textContent = formatCurrency(shipment.total_cost);
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Nessun prodotto associato.</td></tr>';
        return;
    }

    let totalValue = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    let totalAllocatedCost = 0;

    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.classList.add('product-row'); // Aggiungi una classe per lo stile
        tr.innerHTML = `
            <td>${product.name || product.product_code || '-'}</td>
            <td>${product.quantity || 0}</td>
            <td>${formatCurrency(product.unit_value)}</td>
            <td>${formatCurrency(product.total_value)}</td>
            <td>${formatWeight(product.weight_kg)}</td>
            <td>${formatVolume(product.volume_cbm)}</td>
            <td>${formatCurrency(product.allocated_cost)}</td>
            <td>
                <button class="sol-btn sol-btn-secondary sol-btn-sm" onclick="editProduct(${product.id})"><i class="fas fa-edit"></i></button>
                <button class="sol-btn sol-btn-danger sol-btn-sm" onclick="deleteProduct(${product.id})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);

        totalValue += product.total_value || 0;
        totalWeight += product.total_weight_kg || 0;
        totalVolume += product.total_volume_cbm || 0;
        totalAllocatedCost += product.allocated_cost || 0;
    });

    document.getElementById('totalValue').textContent = formatCurrency(totalValue);
    document.getElementById('totalWeight').textContent = formatWeight(totalWeight);
    document.getElementById('totalVolume').textContent = formatVolume(totalVolume);
    document.getElementById('totalAllocatedCost').textContent = formatCurrency(totalAllocatedCost);
}

function renderDocumentsTable(documents) {
    const tbody = document.getElementById('documentsTableBody');
    tbody.innerHTML = '';

    if (!documents || documents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nessun documento caricato.</td></tr>';
        return;
    }

    documents.forEach(doc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><a href="${doc.file_path}" target="_blank">${doc.file_name}</a></td>
            <td>${formatDocumentCategory(doc.document_category)}</td>
            <td>${formatDate(doc.created_at)}</td>
            <td>
                <button class="sol-btn sol-btn-danger sol-btn-sm" onclick="deleteDocument('${doc.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function formatCurrency(value) {
    if (typeof value !== 'number') return '€ 0,00';
    return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function formatWeight(value) {
    if (typeof value !== 'number') return '0 kg';
    return `${value.toFixed(3)} kg`;
}

function formatVolume(value) {
    if (typeof value !== 'number') return '0 m³';
    return `${value.toFixed(3)} m³`;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
}

function formatStatus(rawStatus) {
    const statusKey = (rawStatus || 'registered').toLowerCase().replace(/ /g, '_');
    const label = rawStatus || 'Registrato';
    return `<span class="status-badge status-${statusKey}">${label}</span>`;
}

function formatDocumentCategory(category) {
    const categories = {
        'commercial_invoice': 'Fattura Commerciale',
        'packing_list': 'Packing List',
        'bill_of_lading': 'Polizza di Carico',
        'customs_clearance': 'Documento di Sdoganamento',
        'transport_invoice': 'Fattura di Trasporto',
        'other': 'Altro'
    };
    return categories[category] || category || '-';
}