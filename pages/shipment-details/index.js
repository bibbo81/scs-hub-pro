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
    setupEventListeners();
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
            <td>
                ${product.product?.name || product.name || '-'}
                <small class="text-muted d-block">${product.product?.sku || ''}</small>
            </td>
            <td>${product.quantity || 0}</td>
            <td>${formatCurrency(product.unit_value)}</td>
            <td>${formatCurrency(product.total_value)}</td>
            <td>${formatWeight(product.weight_kg)}</td>
            <td>${formatVolume(product.volume_cbm)}</td>
            <td>${formatCurrency(product.allocated_cost)}</td>
            <td>
                <button class="sol-btn sol-btn-secondary sol-btn-sm edit-product-btn" data-product-id="${product.id}" title="Modifica Prodotto"><i class="fas fa-edit"></i></button>
                <button class="sol-btn sol-btn-danger sol-btn-sm delete-product-btn" data-product-id="${product.id}" title="Elimina Prodotto"><i class="fas fa-trash"></i></button>
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
                <button class="sol-btn sol-btn-danger sol-btn-sm delete-document-btn" data-document-id="${doc.id}" title="Elimina Documento"><i class="fas fa-trash"></i></button>
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

function setupEventListeners() {
    // Pulsanti statici
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', addProduct);
    }

    const uploadDocumentBtn = document.getElementById('uploadDocumentBtn');
    if (uploadDocumentBtn) {
        uploadDocumentBtn.addEventListener('click', uploadDocument);
    }

    // Delega eventi per pulsanti dinamici nella tabella prodotti
    const productsTableBody = document.getElementById('productsTableBody');
    if (productsTableBody) {
        productsTableBody.addEventListener('click', (event) => {
            const editBtn = event.target.closest('.edit-product-btn');
            if (editBtn) {
                const productId = editBtn.dataset.productId;
                editProduct(productId);
                return;
            }

            const deleteBtn = event.target.closest('.delete-product-btn');
            if (deleteBtn) {
                const productId = deleteBtn.dataset.productId;
                deleteProduct(productId);
                return;
            }
        });
    }

    // Delega eventi per pulsanti dinamici nella tabella documenti
    const documentsTableBody = document.getElementById('documentsTableBody');
    if (documentsTableBody) {
        documentsTableBody.addEventListener('click', (event) => {
            const deleteBtn = event.target.closest('.delete-document-btn');
            if (deleteBtn) {
                const documentId = deleteBtn.dataset.documentId;
                deleteDocument(documentId);
            }
        });
    }
}

// Funzioni placeholder per le azioni (da implementare)
function editProduct(productId) {
    notificationSystem.info(`Funzione "Modifica Prodotto" (ID: ${productId}) non ancora implementata.`);
}
function deleteProduct(productId) {
    notificationSystem.info(`Funzione "Elimina Prodotto" (ID: ${productId}) non ancora implementata.`);
}
function uploadDocument() { notificationSystem.info('Funzione "Carica Documento" non ancora implementata.'); }
function deleteDocument(documentId) {
    notificationSystem.info(`Funzione "Elimina Documento" (ID: ${documentId}) non ancora implementata.`);
}

async function addProduct() {
    // 1. Recupera la lista completa dei prodotti una sola volta
    let allProducts = [];
    try {
        allProducts = await dataManager.getAllProducts();
    } catch (error) {
        notificationSystem.error('Impossibile caricare la lista dei prodotti.');
        console.error('Errore caricamento prodotti per la ricerca:', error);
        return;
    }

    let selectedProduct = null;

    ModalSystem.show({
        title: 'Aggiungi Prodotto alla Spedizione',
        content: `
            <form id="addProductForm" class="sol-form" onsubmit="return false;">
                <div class="sol-form-group">
                    <label for="searchProductInput" class="sol-form-label">Cerca Prodotto (Nome o SKU)</label>
                    <input type="text" id="searchProductInput" class="sol-form-input" placeholder="Inizia a digitare per cercare...">
                </div>

                <div id="productSearchResults" class="search-results-container">
                    <!-- I risultati della ricerca appariranno qui -->
                </div>

                <div class="sol-form-group">
                    <label for="quantity" class="sol-form-label">Quantità</label>
                    <input type="number" id="quantity" class="sol-form-input" value="1" min="1" required>
                </div>
            </form>
            <style>
                .search-results-container { max-height: 200px; overflow-y: auto; border: 1px solid #e0e6ed; margin-top: -1px; border-radius: 0 0 5px 5px; }
                .search-result-item { padding: 10px; cursor: pointer; border-bottom: 1px solid #e0e6ed; }
                .search-result-item:last-child { border-bottom: none; }
                .search-result-item:hover { background-color: #f8f9fa; }
                .search-result-item.selected { background-color: #007aff; color: white; }
                .search-result-item small { color: #6c757d; }
                .search-result-item.selected small { color: #e0e6ed; }
            </style>
        `,
        actions: [
            { label: 'Annulla', variant: 'secondary', action: () => ModalSystem.close() },
            {
                label: 'Aggiungi',
                variant: 'primary',
                action: async () => { // 5. Azione del pulsante "Aggiungi"
                    if (!selectedProduct) {
                        notificationSystem.error('Selezionare un prodotto dalla lista.');
                        return;
                    }

                    const quantity = parseInt(document.getElementById('quantity').value);
                    if (isNaN(quantity) || quantity <= 0) {
                        notificationSystem.error('Inserire una quantità valida.');
                        return;
                    }

                    const shipmentId = getShipmentIdFromURL();
                    const productData = {
                        product_id: selectedProduct.id,
                        name: selectedProduct.name,
                        sku: selectedProduct.sku,
                        quantity: quantity,
                        unit_value: selectedProduct.unit_value || 0,
                        weight_kg: selectedProduct.weight_kg || 0,
                        volume_cbm: selectedProduct.volume_cbm || 0,
                    };

                    try {
                        const addedProduct = await dataManager.addShipmentItem(shipmentId, productData);
                        ModalSystem.close();
                        notificationSystem.success('Prodotto aggiunto alla spedizione!');
                        // Ricarica tutto per semplicità e per aggiornare i totali
                        loadShipmentDetails(shipmentId);
                    } catch (error) {
                        console.error('Errore aggiunta prodotto:', error);
                        notificationSystem.error('Errore durante l\'aggiunta del prodotto.');
                    }
                }
            }
        ],
        onShow: () => { // 2. Logica eseguita quando la modale appare
            const searchInput = document.getElementById('searchProductInput');
            const resultsContainer = document.getElementById('productSearchResults');

            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();
                resultsContainer.innerHTML = '';

                if (searchTerm.length < 2) {
                    resultsContainer.innerHTML = '<div class="search-result-item"><small>Digita almeno 2 caratteri per cercare</small></div>';
                    return;
                }

                const filtered = allProducts.filter(p =>
                    p.name.toLowerCase().includes(searchTerm) ||
                    (p.sku && p.sku.toLowerCase().includes(searchTerm))
                );

                if (filtered.length === 0) {
                    resultsContainer.innerHTML = '<div class="search-result-item"><small>Nessun prodotto trovato</small></div>';
                    return;
                }

                filtered.slice(0, 50).forEach(product => { // Limita a 50 risultati per performance
                    const item = document.createElement('div');
                    item.className = 'search-result-item';
                    item.innerHTML = `
                        <strong>${product.name}</strong>
                        <small class="d-block">SKU: ${product.sku || 'N/D'}</small>
                    `;
                    item.addEventListener('click', () => { // 3. Azione al click su un risultato
                        selectedProduct = product;
                        searchInput.value = product.name; // Mostra il nome nel campo di ricerca
                        resultsContainer.innerHTML = ''; // Nasconde la lista
                        document.getElementById('quantity').focus(); // Sposta il focus sulla quantità
                    });
                    resultsContainer.appendChild(item);
                });
            });
        }
    });
}

// Funzione per aggiungere una riga alla tabella prodotti
function renderProductRow(product) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.classList.add('product-row');
    tr.innerHTML = `
        <td>
            ${product.product?.name || product.name || '-'}
            <small class="text-muted d-block">${product.product?.sku || ''}</small>
        </td>
        <td>${product.quantity || 0}</td>
        <td>${formatCurrency(product.unit_value)}</td>
        <td>${formatCurrency(product.total_value)}</td>
        <td>${formatWeight(product.weight_kg)}</td>
        <td>${formatVolume(product.volume_cbm)}</td>
        <td>${formatCurrency(product.allocated_cost)}</td>
        <td>
            <button class="sol-btn sol-btn-secondary sol-btn-sm" onclick="editProduct('${product.id}')"><i class="fas fa-edit"></i></button>
            <button class="sol-btn sol-btn-danger sol-btn-sm" onclick="deleteProduct('${product.id}')"><i class="fas fa-trash"></i></button>
        </td>
    `;
    tbody.appendChild(tr);

    // Aggiorna i totali della tabella
    updateProductsTableTotals();
}

// TODO: Implementa la funzione per aggiornare i totali della tabella prodotti
function updateProductsTableTotals() {
    // Recupera tutti i prodotti dalla tabella e ricalcola i totali
    // ...
}