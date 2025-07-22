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
    try {
        const allProducts = await dataManager.getAllProducts();
        console.log(`[addProduct] Caricati ${allProducts.length} prodotti.`);

        // 1. Definisci le funzioni helper che verranno incorporate nell'HTML.
        // Devono essere collegate all'oggetto 'window' per essere accessibili dagli event handler inline.
        window.filterProducts = function() {
            const searchTerm = document.getElementById('productSearchInput').value.toLowerCase();
            const rows = document.querySelectorAll('#product-table-body tr');
            rows.forEach(row => {
                const name = row.dataset.name || '';
                const sku = row.dataset.sku || '';
                if (name.includes(searchTerm) || sku.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        };

        window.toggleProductQuantity = function(checkbox) {
            const row = checkbox.closest('tr');
            const quantityInput = row.querySelector('.quantity-input');
            quantityInput.disabled = !checkbox.checked;
            if (checkbox.checked) {
                quantityInput.focus();
                quantityInput.select();
            }
        };

        // 2. Costruisci il contenuto HTML della modale come stringa
        const modalContent = `
            <div class="sol-form">
                <div class="sol-form-group">
                    <input type="text" id="productSearchInput" class="sol-form-input" 
                           placeholder="Cerca per nome, SKU..." oninput="window.filterProducts()">
                </div>
            </div>
            <div class="product-list-container">
                <table class="product-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Prodotto</th>
                            <th>SKU</th>
                            <th>Quantità</th>
                        </tr>
                    </thead>
                    <tbody id="product-table-body">
                        ${allProducts.map(product => `
                            <tr data-name="${(product.name || '').toLowerCase()}" data-sku="${(product.sku || '').toLowerCase()}">
                                <td>
                                    <input type="checkbox" class="product-row-checkbox" 
                                           data-product-id="${product.id}" 
                                           onchange="window.toggleProductQuantity(this)">
                                </td>
                                <td>${product.name || 'Senza nome'}</td>
                                <td>${product.sku || 'N/D'}</td>
                                <td><input type="number" class="sol-form-input quantity-input" value="1" min="1" disabled></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <style>
                .product-list-container { max-height: 400px; overflow-y: auto; border: 1px solid #e0e6ed; border-radius: 5px; margin-top: 1rem; background: #fff; }
                .product-table { width: 100%; border-collapse: collapse; }
                .product-table th, .product-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e0e6ed; font-size: 14px; }
                .product-table th { background-color: #f8f9fa; font-weight: 600; }
                .product-table tr:hover { background-color: #f1f1f1; }
                .product-table .quantity-input { width: 70px; padding: 4px 8px; }
                .product-table .product-row-checkbox { width: 16px; height: 16px; }
            </style>
        `;
        // 3. Mostra la modale
        ModalSystem.show({
            title: 'Aggiungi Prodotti alla Spedizione',
            size: 'lg',
            content: modalContent,
            buttons: [
                { text: 'Annulla', className: 'sol-btn sol-btn-secondary', action: () => ModalSystem.close() },
                {
                    text: 'Aggiungi Selezionati',
                    className: 'sol-btn sol-btn-primary',
                    action: async () => {
                        const selectedItems = [];
                        document.querySelectorAll('.product-row-checkbox:checked').forEach(checkbox => {
                            const row = checkbox.closest('tr');
                            const productId = checkbox.dataset.productId;
                            const quantityInput = row.querySelector('.quantity-input');
                            const quantity = parseInt(quantityInput.value, 10);

                            if (quantity > 0) {
                                const product = allProducts.find(p => p.id === productId);
                                if (product) {
                                    selectedItems.push({ product, quantity });
                                }
                            }
                        });

                        if (selectedItems.length === 0) {
                            notificationSystem.warning('Nessun prodotto selezionato o quantità non valida.');
                            return;
                        }

                        const shipmentId = getShipmentIdFromURL();
                        try {
                            notificationSystem.info(`Aggiunta di ${selectedItems.length} prodotti in corso...`);
                            const addPromises = selectedItems.map(({ product, quantity }) => {
                                const productData = {
                                    product_id: product.id,
                                    name: product.name,
                                    sku: product.sku,
                                    quantity: quantity,
                                    unit_value: product.unit_value || 0,
                                    weight_kg: product.weight_kg || 0,
                                    volume_cbm: 0,
                                };
                                return dataManager.addShipmentItem(shipmentId, productData);
                            });
                            await Promise.all(addPromises);
                            ModalSystem.close();
                            notificationSystem.success(`${selectedItems.length} prodotti aggiunti con successo!`);
                            loadShipmentDetails(shipmentId);
                        } catch (error) {
                            console.error('Errore aggiunta prodotto:', error);
                            notificationSystem.error('Errore durante l\'aggiunta dei prodotti.');
                        }
                    }
                }
            ]
        });
    } catch (error) {
        notificationSystem.error('Impossibile caricare la lista dei prodotti.');
        console.error('Errore caricamento prodotti per la ricerca:', error);
    }
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